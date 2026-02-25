import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_moderation_audit_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testAdmin123!" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Retrieve a specific review moderation action using generated UUID
  const moderationAction =
    await api.functional.ecommerce.administrator.review_moderation_actions.at(
      adminConnection,
      {
        actionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(moderationAction);
  // Validate business logic - moderation action content should be meaningful
  TestValidator.predicate(
    "action type should not be empty",
    moderationAction.action_type.length > 0,
  );
  TestValidator.predicate(
    "reason should not be empty",
    moderationAction.reason.length > 0,
  );
  TestValidator.predicate(
    "status should not be empty",
    moderationAction.status.length > 0,
  );
  // Validate administrator information integrity
  TestValidator.predicate(
    "administrator ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.administrator.id,
    ),
  );
  TestValidator.predicate(
    "administrator email should be valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moderationAction.administrator.email),
  );
  // Validate review information integrity
  TestValidator.predicate(
    "review ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.review.id,
    ),
  );
  TestValidator.predicate(
    "rating should be within valid range",
    moderationAction.review.rating >= 1 && moderationAction.review.rating <= 5,
  );
  // Validate customer information within review
  TestValidator.predicate(
    "customer ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.review.customer.id,
    ),
  );
  TestValidator.predicate(
    "customer email should be valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moderationAction.review.customer.email),
  );
  TestValidator.predicate(
    "customer display name should not be empty",
    moderationAction.review.customer.display_name.length > 0,
  );
  // Validate chronological order of timestamps
  const createdAt = new Date(moderationAction.created_at);
  const updatedAt = new Date(moderationAction.updated_at);
  TestValidator.predicate(
    "updated_at should not be before created_at",
    updatedAt >= createdAt,
  );
}
