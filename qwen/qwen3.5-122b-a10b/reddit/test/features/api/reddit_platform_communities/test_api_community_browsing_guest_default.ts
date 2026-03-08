import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browsing_guest_default(
  connection: api.IConnection,
): Promise<void> {
  // Guest user browsing communities with default pagination
  const output: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.communities.index(connection, {
      body: {},
    });
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page exists",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit exists",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    output.pagination.pages >= 0,
  );
  // Validate community list structure
  if (output.data.length > 0) {
    const community = output.data[0];
    typia.assert(community);
    // Validate required community fields
    TestValidator.predicate("community has id", community.id.length > 0);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "community has subscriber count",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      community.created_at.length > 0,
    );
    // Validate owner information
    TestValidator.predicate("owner has id", community.owner.id.length > 0);
    TestValidator.predicate(
      "owner has username",
      community.owner.username.length > 0,
    );
    TestValidator.predicate(
      "owner has karma score",
      typeof community.owner.karma_score === "number",
    );
  }
}
