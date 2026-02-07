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

export async function test_api_moderation_comment_approve_with_justification(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const citizenConnection: api.IConnection = { host: connection.host };
  // 1. Register citizen user
  const citizenData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: typia.random<string>(),
  } satisfies IEconomicBoardCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, {
    body: citizenData,
  });
  // 2. Log in as citizen to create a comment
  await authorize_citizen_login(citizenConnection, {
    body: {
      email: citizenData.email,
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  // 3. Create a comment that will be flagged and approved
  // Use a generated UUID for articleId
  const articleId = typia.random<string & tags.Format<"uuid">>() as string;
  const createdComment_ =
    await api.functional.economicBoard.citizen.articles.comments.create(
      citizenConnection,
      {
        articleId,
        body: {} satisfies IEconomicBoardComment.ICreate,
      },
    );
  // Cast to an object with id property since IEconomicBoardComment is incorrectly defined as empty
  // Although IEconomicBoardComment extends IEntity which has id, the interface is defined as empty so we assert
  const createdComment = typia.assert<
    IEconomicBoardComment & {
      id: string;
    }
  >(createdComment_);
  // 4. Register super administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "superadmin@example.com",
      password: "SuperPass123!",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 5. Log in as super administrator
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "superadmin@example.com",
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 6. Approve the comment with a justification
  const approveResponse =
    await api.functional.economicBoard.administrator.moderation.comments.approve(
      adminConnection,
      {
        body: {
          commentId: createdComment.id,
          justification:
            "Comment is valuable and adheres to community guidelines." satisfies
              | (string & tags.MinLength<10> & tags.MaxLength<500>)
              | null
              | undefined,
        } satisfies IEconomicBoardComment.IApprove,
      },
    );
  typia.assert(approveResponse);
}
