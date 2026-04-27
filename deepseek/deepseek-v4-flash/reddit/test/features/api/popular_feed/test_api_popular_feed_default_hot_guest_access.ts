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

export async function test_api_popular_feed_default_hot_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Call the popular feed endpoint with default parameters
  // Empty body means: sort="hot" (default), limit=20 (default), page=1 (default)
  const output: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(output);
  // Validate pagination metadata is present and well-formed
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.limit <= 50 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  // Validate each post's type-specific preview field matches its type discriminator
  for (const post of output.data) {
    if (post.type === "text") {
      TestValidator.predicate(
        "text post has text_preview",
        () => typeof post.text_preview === "string",
      );
    } else if (post.type === "image") {
      TestValidator.predicate(
        "image post has image_url",
        () => typeof post.image_url === "string",
      );
    } else if (post.type === "link") {
      TestValidator.predicate(
        "link post has domain_name",
        () => typeof post.domain_name === "string",
      );
    }
  }
  // Validate Hot sort ordering (non-increasing hot score)
  // Hot score = vote_score / ((hours_since_creation + 2) ^ 1.5)
  // Higher hot score = earlier position in feed
  if (output.data.length >= 2) {
    for (let i: number = 1; i < output.data.length; ++i) {
      const prev: ICommunityPlatformPost.ISummary = output.data[i - 1];
      const curr: ICommunityPlatformPost.ISummary = output.data[i];
      const prevHours: number =
        (Date.now() - new Date(prev.created_at).getTime()) / 3600000;
      const currHours: number =
        (Date.now() - new Date(curr.created_at).getTime()) / 3600000;
      const prevHot: number = prev.vote_score / Math.pow(prevHours + 2, 1.5);
      const currHot: number = curr.vote_score / Math.pow(currHours + 2, 1.5);
      TestValidator.predicate(
        "posts ordered by Hot algorithm (non-increasing hot score)",
        () => prevHot >= currHot,
      );
    }
  }
}
