import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_user_profile_view_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate citizen user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(authorizedUser);
  // Update connection with authorized user's token
  const userProfileConnection: api.IConnection = { host: connection.host };
  userProfileConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // Fetch user profile
  const userProfile: IEconomicBoardCitizen =
    await api.functional.economicBoard.users.at(userProfileConnection, {
      userId: authorizedUser.id,
    });
  typia.assert(userProfile);
  // Validate profile data
  TestValidator.equals("user ID matches", userProfile.id, authorizedUser.id);
  TestValidator.equals(
    "email matches",
    userProfile.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "display_name matches",
    userProfile.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals("bio matches", userProfile.bio, authorizedUser.bio);
  TestValidator.equals("is_banned is false", userProfile.is_banned, false);
  TestValidator.equals("ban_reason is null", userProfile.ban_reason, null);
  TestValidator.equals(
    "created_at matches",
    userProfile.created_at,
    authorizedUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    userProfile.updated_at,
    authorizedUser.updated_at,
  );
  TestValidator.equals(
    "article_count matches",
    userProfile.article_count,
    authorizedUser.article_count,
  );
  TestValidator.equals(
    "comment_count matches",
    userProfile.comment_count,
    authorizedUser.comment_count,
  );
}
