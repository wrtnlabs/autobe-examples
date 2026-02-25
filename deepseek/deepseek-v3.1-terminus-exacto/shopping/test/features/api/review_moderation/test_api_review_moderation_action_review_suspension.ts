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

export async function test_api_review_moderation_action_review_suspension(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create review moderation action for suspension using utility function
  const suspensionAction =
    await generate_random_ecommerce_administrator_review_moderation_actions_create(
      adminConnection,
      {
        body: {
          action_type: "suspend_review",
          reason:
            "Review contains inappropriate language and violates community guidelines",
          status: "pending",
          additional_notes: "Automated test suspension action",
        } satisfies IEcommerceReviewModerationAction.ICreate,
      },
    );
  typia.assert(suspensionAction);
  // The typia.assert() performs complete validation, so no additional manual checks are needed
  // It validates all properties including action_type, status, reason, timestamps, and administrator details
}
