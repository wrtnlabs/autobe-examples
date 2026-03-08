import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_list_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest user account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IEconomicPoliticalBoardGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // 2. Create authenticated connection with guest token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: guestAuth.token.access,
  };
  // 3. Generate a valid UUID that doesn't exist (non-existent article)
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve comments for non-existent article
  // Expected: 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent article",
    404,
    async () => {
      await api.functional.economicPoliticalBoard.guest.articles.comments.index(
        authenticatedConnection,
        {
          articleId: nonExistentArticleId,
          body: {},
        },
      );
    },
  );
}
