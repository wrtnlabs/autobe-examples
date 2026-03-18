import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_branch_scoped_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `member_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const request = {
    postId: typia.random<string & tags.Format<"uuid">>(),
    parentId: typia.random<string & tags.Format<"uuid">>(),
    sort: "new",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformComment.IRequest;
  const page = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    { body: request },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data size fits requested limit",
    page.data.length <= request.limit,
  );
  for (const comment of page.data) {
    typia.assert(comment);
    TestValidator.equals(
      "comment scoped to requested post",
      comment.community_platform_post_id,
      request.postId,
    );
    TestValidator.equals(
      "comment scoped to requested parent branch",
      comment.parent_id,
      request.parentId,
    );
  }
  const rootPage = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    {
      body: {
        postId: request.postId,
        parentId: null,
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(rootPage);
  TestValidator.equals(
    "root browse uses same post scope",
    rootPage.pagination.current,
    1,
  );
  for (const comment of rootPage.data) {
    typia.assert(comment);
    TestValidator.equals(
      "root browse remains within the selected post",
      comment.community_platform_post_id,
      request.postId,
    );
    TestValidator.equals("root browse is top-level", comment.parent_id, null);
  }
}
