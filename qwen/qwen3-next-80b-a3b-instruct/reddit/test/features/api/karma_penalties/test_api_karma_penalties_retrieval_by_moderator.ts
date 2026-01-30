import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaPenalty";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaPenalty";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_karma_penalties_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Retrieve karma penalties using index endpoint
  // We'll create a complete IRequest object with all required properties
  const request: ICommunityBbsKarmaPenalty.IRequest = {
    user_id: moderator.user_id, // Use the moderator's user_id from the authenticated response
    penalty_type: "temporary_suspension", // Valid enum value from IRequest
    applied_at: new Date().toISOString(), // ISO format date string
    expires_at: new Date(Date.now() + 86400000).toISOString(), // ISO format date string
    admin_id: moderator.user_id, // Use the same user_id as admin_id (moderator can view their own penalties)
    after: "", // Fixed: Provide an empty string as required by the schema (string type, not undefined)
    limit: 20, // Default value as specified in the interface (number with default 20)
    sort_by: "applied_at", // One of the valid values from IRequest
    order: "desc", // Default value as specified in the interface ("desc")
  } satisfies ICommunityBbsKarmaPenalty.IRequest;
  const response: IPageICommunityBbsKarmaPenalty =
    await api.functional.communityBbs.moderator.karma_penalties.index(
      moderatorConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Step 3: Validate response structure
  // Verify existence of pagination structure
  TestValidator.equals(
    "pagination property exists",
    response.pagination != null,
    true,
  );
  TestValidator.equals("data property exists", response.data != null, true);
  // Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page is a number",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is a number",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is a number",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is a number",
    typeof response.pagination.pages,
    "number",
  );
  // Verify data contains an array
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // If there are any records, validate structure of first item
  if (response.data.length > 0) {
    const firstPenalty = response.data[0];
    // Validate required fields exist
    TestValidator.equals(
      "penalty_type exists",
      firstPenalty.penalty_type != null,
      true,
    );
    TestValidator.equals("reason exists", firstPenalty.reason != null, true);
    TestValidator.equals(
      "moderator_id exists",
      firstPenalty.moderator_id != null,
      true,
    );
    TestValidator.equals("user_id exists", firstPenalty.user_id != null, true);
    TestValidator.equals(
      "applied_at exists",
      firstPenalty.applied_at != null,
      true,
    );
    // Validate field types
    TestValidator.equals(
      "penalty_type is string",
      typeof firstPenalty.penalty_type,
      "string",
    );
    TestValidator.equals(
      "reason is string",
      typeof firstPenalty.reason,
      "string",
    );
    TestValidator.equals(
      "moderator_id is UUID",
      typeof firstPenalty.moderator_id,
      "string",
    );
    TestValidator.equals(
      "user_id is UUID",
      typeof firstPenalty.user_id,
      "string",
    );
    TestValidator.equals(
      "applied_at is ISO date-time",
      typeof firstPenalty.applied_at,
      "string",
    );
    // Validate moderator_id matches authenticated moderator
    TestValidator.equals(
      "moderator_id matches authenticated moderator",
      firstPenalty.moderator_id,
      moderator.id,
    );
  }
}
