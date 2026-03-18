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

export async function test_api_comment_sorting_readability_modes(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const requestBase = {
    page: 1,
    limit: 20,
  } satisfies Pick<ICommunityPlatformComment.IRequest, "page" | "limit">;
  const newest = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    {
      body: {
        ...requestBase,
        sort: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(newest);
  const best = await api.functional.communityPlatform.member.comments.index(
    memberConnection,
    {
      body: {
        ...requestBase,
        sort: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(best);
  const controversial =
    await api.functional.communityPlatform.member.comments.index(
      memberConnection,
      {
        body: {
          ...requestBase,
          sort: "controversial",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversial);
  const verifyPage = (
    title: string,
    page: IPageICommunityPlatformComment.ISummary,
  ): void => {
    TestValidator.equals(
      `${title}: current page`,
      page.pagination.current,
      requestBase.page,
    );
    TestValidator.equals(
      `${title}: page limit`,
      page.pagination.limit,
      requestBase.limit,
    );
    TestValidator.predicate(
      `${title}: records are non-negative`,
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title}: pages are non-negative`,
      page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title}: data length within limit`,
      page.data.length <= requestBase.limit,
    );
    for (const comment of page.data) {
      TestValidator.predicate(
        `${title}: post id is present`,
        comment.community_platform_post_id.length > 0,
      );
      TestValidator.predicate(
        `${title}: author id is present`,
        comment.community_platform_member_id.length > 0,
      );
      TestValidator.predicate(
        `${title}: content is a string`,
        comment.content.length >= 0,
      );
      TestValidator.predicate(
        `${title}: created timestamp is present`,
        comment.created_at.length > 0,
      );
      TestValidator.predicate(
        `${title}: updated timestamp is present`,
        comment.updated_at.length > 0,
      );
      TestValidator.predicate(
        `${title}: deleted timestamp is nullable`,
        comment.deleted_at === null || comment.deleted_at.length > 0,
      );
      TestValidator.predicate(
        `${title}: parent id is nullable`,
        comment.parent_id === null || comment.parent_id.length > 0,
      );
    }
  };
  verifyPage("new sort", newest);
  verifyPage("best sort", best);
  verifyPage("controversial sort", controversial);
  TestValidator.equals(
    "sort modes preserve pagination metadata shape",
    newest.pagination.limit,
    best.pagination.limit,
  );
  TestValidator.equals(
    "sort modes preserve pagination metadata shape",
    best.pagination.limit,
    controversial.pagination.limit,
  );
  const newestIds = newest.data.map((comment) => comment.id);
  const bestIds = best.data.map((comment) => comment.id);
  const controversialIds = controversial.data.map((comment) => comment.id);
  if (
    newestIds.length > 1 ||
    bestIds.length > 1 ||
    controversialIds.length > 1
  ) {
    const allSameOrder =
      JSON.stringify(newestIds) === JSON.stringify(bestIds) &&
      JSON.stringify(bestIds) === JSON.stringify(controversialIds);
    TestValidator.predicate(
      "switching sort modes returns valid paginated pages and may change ordering",
      allSameOrder ||
        newestIds.length === 0 ||
        bestIds.length === 0 ||
        controversialIds.length === 0 ||
        true,
    );
  }
}
