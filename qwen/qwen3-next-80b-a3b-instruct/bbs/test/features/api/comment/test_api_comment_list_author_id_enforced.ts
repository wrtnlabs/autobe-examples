import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_comment_list_author_id_enforced(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first citizen user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1: IEconomicBoardCitizen.IAuthorized = await authorize_citizen_join(
    user1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    },
  );
  typia.assert(user1);
  // 2. Authenticate second citizen user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2: IEconomicBoardCitizen.IAuthorized = await authorize_citizen_join(
    user2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    },
  );
  typia.assert(user2);
  // 3. First request: Get comments as user1 (no author_id specified)
  const responseAll: IPageIEconomicBoardComment.ISummary =
    await api.functional.economicBoard.citizen.comments.index(user1Connection, {
      body: {} satisfies IEconomicBoardComment.IRequest,
    });
  typia.assert(responseAll);
  // 4. Second request: Get comments as user1, but explicitly filtering by user2's ID
  const responseFiltered: IPageIEconomicBoardComment.ISummary =
    await api.functional.economicBoard.citizen.comments.index(user1Connection, {
      body: {
        author_id: user2.id, // User1 tries to filter for user2's comments
      } satisfies IEconomicBoardComment.IRequest,
    });
  typia.assert(responseFiltered);
  // 5. Validate: The system must only return comments authored by user1 — so the filtered result should be exactly the same as the unfiltered result
  TestValidator.equals(
    "comment list with author_id filter must match unfiltered list (authorization enforced)",
    responseAll.data.length,
    responseFiltered.data.length,
  );
  TestValidator.predicate(
    "all comments in both lists must have identical IDs",
    () =>
      responseAll.data.every(
        (comment, index) => comment.id === responseFiltered.data[index].id,
      ),
  );
  // 6. Additionally, ensure no comments from user2 are present: if user2 had comments, and we filtered for user2, we still wouldn't see them
  // This confirms that even if user2 has comments, user1 cannot retrieve them — enforced by authorization
  TestValidator.predicate(
    "user1's filtered list should not include any comment from user2",
    () => {
      return responseFiltered.data.every(
        (comment) => comment.author.id === user1.id,
      );
    },
  );
}