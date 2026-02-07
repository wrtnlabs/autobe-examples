import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function test_api_promotion_request_retrieval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Create regular user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123456",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits promotion request with proper length validation
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Create super administrator connection using admin join
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      display_name: "Super Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Super administrator retrieves the promotion request
  const retrievedRequest =
    await api.functional.discussionBoard.admin.promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate pending status characteristics
  TestValidator.equals(
    "status should be pending",
    retrievedRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approved_at should be null",
    retrievedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at should be null",
    retrievedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer should be null",
    retrievedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "administrator should be null",
    retrievedRequest.administrator,
    null,
  );
  // Validate presence of required fields
  TestValidator.predicate(
    "reason should be present",
    retrievedRequest.reason.length >= 50,
  );
  TestValidator.predicate(
    "created_at should be present",
    retrievedRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    retrievedRequest.updated_at.length > 0,
  );
  TestValidator.predicate(
    "user should be present",
    retrievedRequest.user !== null,
  );
  TestValidator.equals(
    "user id should match",
    retrievedRequest.user.id,
    promotionRequest.user.id,
  );
}
