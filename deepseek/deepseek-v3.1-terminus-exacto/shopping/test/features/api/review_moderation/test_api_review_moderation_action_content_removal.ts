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

export async function test_api_review_moderation_action_content_removal(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Create moderation action with content removal
  const moderationAction =
    await generate_random_ecommerce_administrator_review_moderation_actions_create(
      adminConnection,
      {
        body: {
          action_type: "remove_content",
          reason:
            "Violates platform content policy regarding inappropriate language",
          status: "completed",
          additional_notes: "Content removed and user notified",
        } satisfies IEcommerceReviewModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Validate business logic (NOT type validation)
  TestValidator.equals(
    "action type is remove_content",
    moderationAction.action_type,
    "remove_content",
  );
  TestValidator.equals(
    "status is completed",
    moderationAction.status,
    "completed",
  );
}
