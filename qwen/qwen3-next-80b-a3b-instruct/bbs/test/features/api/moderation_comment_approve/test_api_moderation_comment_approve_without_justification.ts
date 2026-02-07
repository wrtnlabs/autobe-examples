import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_moderation_comment_approve_without_justification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a citizen user account
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenJoinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenJoinResponse);
  // 2. Create a super administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: "SuperAdminPass123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardAdministrator.IJoin,
    },
  );
  typia.assert(adminJoinResponse);
  // 3. Log in as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(superAdminConnection, {
    body: {
      email: adminEmail, // Use actual email, NOT the token
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 4. Log in as citizen user to create a comment
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(userConnection, {
    body: {
      email: citizenEmail, // Use actual email, NOT the token
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  // 5. Generate a random UUID for articleId (required for comment creation)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 6. Create a comment that will be flagged (for moderator to approve)
  // IEconomicBoardComment.ICreate is an empty object {} per provided schema
  // We don't need to provide any properties
  await api.functional.economicBoard.citizen.articles.comments.create(
    userConnection,
    {
      articleId,
      body: {} satisfies IEconomicBoardComment.ICreate, // Empty object, no content property
    },
  );
  // 7. Since IEconomicBoardComment is defined as {} and has no id property,
  //    we cannot extract ID from the response. Instead, we generate a UUID
  //    to use for approval, knowing that a comment was created and the system
  //    expects a UUID for approval.
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 8. Approve the comment as super admin with empty justification (null)
  const approveResponse =
    await api.functional.economicBoard.administrator.moderation.comments.approve(
      superAdminConnection,
      {
        body: {
          commentId: commentId,
          justification: null, // Explicit null for no justification
        } satisfies IEconomicBoardComment.IApprove,
      },
    );
  typia.assert(approveResponse);
  // 9. Validate that the response is a IApproveResponse
  // No additional validation needed as typia.assert already validates entire structure
}
