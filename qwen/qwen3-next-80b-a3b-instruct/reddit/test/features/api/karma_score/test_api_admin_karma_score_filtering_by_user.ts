import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_karma_score_filtering_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  // Step 2: Generate a random user_id to filter by
  // We cannot create karma scores, so we must test filtering on existing data
  // This user_id might not have karma scores, but the API should still respond correctly
  const testUserId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Use the index endpoint to filter by user_id
  const result: IPageICommunityBbsKarmaScore.ISummary =
    await api.functional.communityBbs.admin.karma_scores.index(
      adminConnection,
      {
        body: {
          user_id: testUserId,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  // Step 4: Validate the response structure
  typia.assert(result);
  // Validate that the response follows the IPageICommunityBbsKarmaScore.ISummary structure
  // We're not validating the exact count since we can't control the data
  TestValidator.predicate("result has pagination", result.pagination !== null);
  TestValidator.predicate("result has data array", Array.isArray(result.data));
  // Validate that each karma score in the results has the specified user_id if any exist
  // If we have results, make sure they are for our filtered user_id
  if (result.data.length > 0) {
    result.data.forEach((score) => {
      TestValidator.equals(
        "actorId matches filtered user_id",
        score.actorId,
        testUserId,
      );
    });
  }
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that if records are 0, data array is empty
  if (result.pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, data is empty",
      result.data.length,
      0,
    );
  }
}
