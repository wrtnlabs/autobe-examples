import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_public_scope_enforced(
  connection: api.IConnection,
): Promise<void> {
  const visitorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    community_slug: `community-${RandomGenerator.alphabets(8)}`,
    sort: "new",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;
  const response =
    await api.functional.communityPlatform.communities.posts.index(
      visitorConnection,
      {
        communityId,
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPost.ISummary>(response);
  TestValidator.equals(
    "requested page reflected in pagination",
    response.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "requested limit reflected in pagination",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "returned rows do not exceed requested limit",
    response.data.length <= requestBody.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    response.pagination.pages >= 0,
  );
  for (const post of response.data) {
    TestValidator.equals(
      "post remains scoped to requested community",
      post.community.id,
      communityId,
    );
    TestValidator.predicate(
      "summary includes non-empty title",
      post.title.length > 0,
    );
    TestValidator.predicate(
      "summary includes author code",
      post.author.code.length > 0,
    );
    TestValidator.predicate(
      "summary includes community slug",
      post.community.slug.length > 0,
    );
    TestValidator.predicate("vote count is non-negative", post.vote_count >= 0);
    TestValidator.predicate(
      "comment count is non-negative",
      post.comment_count >= 0,
    );
  }
}
