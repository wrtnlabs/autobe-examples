import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshots_retrieve_default_pagination_no_filters(
  connection: api.IConnection,
) {
  // Create a base connection clone for use
  const testConnection: api.IConnection = { host: connection.host };
  // Since there is no filter and pagination info required is default,
  // Create an empty request body as per ICommunityPlatformPostSnapshot.IRequest definition
  const body: ICommunityPlatformPostSnapshot.IRequest = {};
  // Call the API endpoint via SDK function
  const response = await api.functional.communityPlatform.postSnapshots.index(
    testConnection,
    { body },
  );
  // Validate full runtime type safety of response as per IPageICommunityPlatformPostSnapshot.ISummary
  typia.assert(response);
  // Validate pagination metadata is present and sensible
  TestValidator.predicate(
    "Pagination object present",
    response.pagination !== null && typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "Current page is first page",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "Limit per page is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that data array exists
  TestValidator.predicate("Data array present", Array.isArray(response.data));
  // For each post snapshot summary, perform field existence checks
  for (const snapshot of response.data) {
    const s = snapshot as any;
    // The ICommunityPlatformPostSnapshot.ISummary type is empty in definition,
    // but from the scenario description, we expect fields:
    // snapshot ID, post title, snapshot creation timestamp, vote score, comment count, original post ID.
    // So check these fields for existence and type at runtime without typing assumptions
    // Snapshot ID
    TestValidator.predicate(
      "snapshot has id",
      typeof s.id === "string" && s.id.length > 0,
    );
    // Post title
    TestValidator.predicate(
      "snapshot has title",
      typeof s.title === "string",
    );
    // Snapshot creation timestamp
    TestValidator.predicate(
      "snapshot has created_at",
      typeof s.created_at === "string",
    );
    // vote score
    TestValidator.predicate(
      "snapshot has vote_score",
      typeof s.vote_score === "number",
    );
    // comment count
    TestValidator.predicate(
      "snapshot has comment_count",
      typeof s.comment_count === "number",
    );
    // original post id
    TestValidator.predicate(
      "snapshot has post_id",
      typeof s.post_id === "string" && s.post_id.length > 0,
    );
  }
}
