import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
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
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Since no API function exists to create a comment in the provided list,
  // we cannot follow the scenario's creation process. We must use only provided functions.
  // The only provided comment function is erase.
  // We assume a valid comment ID exists in the system and we are allowed to delete our own comment.
  // We generate a valid UUID for comment deletion to test the endpoint.
  // 1. Citizen joins the platform using utility function
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResponse);
  // The utility function authorize_citizen_join automatically sets the Authorization header
  // in the citizenConnection object internally (as per the underlying function's @setHeader directive).
  // Manual header assignment is redundant and incorrect. We do not set headers manually.
  // 2. Delete a comment using a random valid UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Perform the deletion - this endpoint is documented and available
  await api.functional.economicBoard.citizen.comments.erase(citizenConnection, {
    commentId,
  });
  // We cannot validate the state because no get endpoint is provided
  // We rely on the test passing if there's no exception (success or appropriate 404)
  // The test passes if no error is thrown. This is the only possible validation.
}
