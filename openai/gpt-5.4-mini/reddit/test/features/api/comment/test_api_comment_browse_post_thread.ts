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

export async function test_api_comment_browse_post_thread(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ssw0rd-${RandomGenerator.alphabets(8)}`,
      username: `member_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  const request = {
    sort: "new",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformComment.IRequest;
  const first = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    { body: request },
  );
  typia.assert(first);
  TestValidator.equals("pagination current", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within page limit",
    first.data.length <= first.pagination.limit,
  );
  const second = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    { body: request },
  );
  typia.assert(second);
  TestValidator.equals(
    "repeat pagination current",
    second.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "repeat pagination limit",
    second.pagination.limit,
    first.pagination.limit,
  );
  TestValidator.equals(
    "repeat pagination records",
    second.pagination.records,
    first.pagination.records,
  );
  TestValidator.equals(
    "repeat pagination pages",
    second.pagination.pages,
    first.pagination.pages,
  );
  TestValidator.equals("repeat data", second.data, first.data);
}
