import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_posts_home_feed(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const request = {
    feed: "home",
    sort: "new",
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformPost.IRequest;
  const first: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.index(
      memberConnection,
      { body: request },
    );
  typia.assert(first);
  TestValidator.equals(
    "requested page should be 1",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be honored",
    first.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "record count cannot be negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count cannot be negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length must not exceed limit",
    first.data.length <= first.pagination.limit,
  );
  const second: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.index(
      memberConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination metadata should be stable",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "first page ordering should be stable",
    second.data.map((post) => post.id),
    first.data.map((post) => post.id),
  );
}
