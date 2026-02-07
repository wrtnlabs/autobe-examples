import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function test_api_promotion_requests_superadmin_view_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = typia.random<string & tags.Format<"password">>();
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword satisfies string as string,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Submit promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 50,
            wordMax: 500,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword satisfies string as string,
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin);
  // Authenticate as super administrator using actual password
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
    },
  });
  // Retrieve promotion request details
  const retrievedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate response structure
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "reason text preserved",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "approved_at is null",
    retrievedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null",
    retrievedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer_notes is null",
    retrievedRequest.reviewer_notes,
    null,
  );
  TestValidator.equals(
    "administrator is null",
    retrievedRequest.administrator,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  // Validate user summary (should not expose email)
  TestValidator.equals("user ID matches", retrievedRequest.user.id, user.id);
  TestValidator.equals(
    "display name matches",
    retrievedRequest.user.display_name,
    user.display_name,
  );
  TestValidator.equals("bio matches", retrievedRequest.user.bio, user.bio);
  TestValidator.predicate("user summary has no email property", () => {
    return !("email" in retrievedRequest.user);
  });
  // Validate timestamps
  TestValidator.predicate("created_at is valid", () => {
    return new Date(retrievedRequest.created_at).getTime() > 0;
  });
  TestValidator.predicate("updated_at is valid", () => {
    return new Date(retrievedRequest.updated_at).getTime() > 0;
  });
}