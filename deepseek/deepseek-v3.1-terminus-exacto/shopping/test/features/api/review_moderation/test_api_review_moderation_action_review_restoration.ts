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
import { generate_random_ecommerce_administrator_review_moderation_actions_create } from "../../../generate/generate_random_ecommerce_administrator_review_moderation_actions_create";
import { prepare_random_ecommerce_review_moderation_action } from "../../../prepare/prepare_random_ecommerce_review_moderation_action";

export async function test_api_review_moderation_action_review_restoration(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create review moderation action with restoration type
  const moderationAction =
    await generate_random_ecommerce_administrator_review_moderation_actions_create(
      adminConnection,
      {
        body: {
          action_type: "restore_review",
          reason:
            "Review was incorrectly moderated and should be restored to public visibility",
          status: "completed",
          additional_notes: "Restoration approved after manual review",
        } satisfies IEcommerceReviewModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Validate the moderation action properties
  TestValidator.equals(
    "action type should be restore_review",
    moderationAction.action_type,
    "restore_review",
  );
  TestValidator.equals(
    "status should be completed",
    moderationAction.status,
    "completed",
  );
  TestValidator.equals(
    "reason should match input",
    moderationAction.reason,
    "Review was incorrectly moderated and should be restored to public visibility",
  );
  TestValidator.equals(
    "additional notes should match input",
    moderationAction.additional_notes,
    "Restoration approved after manual review",
  );
  // Validate administrator relationship
  typia.assert(moderationAction.administrator);
  TestValidator.predicate(
    "administrator should have valid email",
    moderationAction.administrator.email.includes("@"),
  );
  // Validate review relationship
  typia.assert(moderationAction.review);
  TestValidator.predicate(
    "review should have valid rating",
    moderationAction.review.rating >= 1 && moderationAction.review.rating <= 5,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at should be valid ISO date",
    new Date(moderationAction.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    new Date(moderationAction.updated_at).toString() !== "Invalid Date",
  );
}
