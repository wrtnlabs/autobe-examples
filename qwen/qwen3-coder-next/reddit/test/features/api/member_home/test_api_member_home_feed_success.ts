import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditPlatformMember.IJoin>();
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: memberData,
    },
  );
  typia.assert(member);
  // 2. Create new connection with authentication token from member data
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: `Bearer ${member.token.access}`,
  };
  // 3. Retrieve home feed for authenticated member
  const homeFeed = await api.functional.redditPlatform.member.home.index(
    authenticatedConnection,
  );
  typia.assert(homeFeed);
  // 4. Validate home feed structure
  TestValidator.predicate(
    "pagination exists",
    () => homeFeed.pagination !== null && homeFeed.pagination !== undefined,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => homeFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => homeFeed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid record count",
    () => homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    () => homeFeed.pagination.pages >= 0,
  );
  // Validate posts structure (if any posts exist)
  for (const post of homeFeed.data) {
    TestValidator.predicate(
      "post has valid id",
      () => post.id !== null && post.id !== undefined,
    );
    TestValidator.predicate(
      "post has title",
      () => post.title !== null && post.title !== undefined,
    );
    TestValidator.predicate("post has valid type", () =>
      ["TEXT", "LINK", "IMAGE"].includes(post.type),
    );
    TestValidator.predicate(
      "post has author info",
      () =>
        post.author !== null &&
        post.author !== undefined &&
        post.author.id !== null &&
        post.author.id !== undefined,
    );
    TestValidator.predicate(
      "post has community info",
      () =>
        post.community !== null &&
        post.community !== undefined &&
        post.community.id !== null &&
        post.community.id !== undefined,
    );
    TestValidator.predicate(
      "vote score is valid",
      () => typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "comment count is valid",
      () => typeof post.commentCount === "number",
    );
    TestValidator.predicate(
      "created at is valid",
      () => post.createdAt !== null && post.createdAt !== undefined,
    );
    // Type-specific validations
    if (post.type === "TEXT") {
      TestValidator.predicate(
        "text post has content preview",
        () => post.contentPreview !== null && post.contentPreview !== undefined,
      );
    } else if (post.type === "LINK") {
      TestValidator.predicate(
        "link post has domain preview",
        () => post.domainPreview !== null && post.domainPreview !== undefined,
      );
    } else if (post.type === "IMAGE") {
      TestValidator.predicate(
        "image post has image preview",
        () => post.imagePreview !== null && post.imagePreview !== undefined,
      );
    }
  }
}
