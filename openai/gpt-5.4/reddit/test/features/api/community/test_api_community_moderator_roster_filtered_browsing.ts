import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_roster_filtered_browsing(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  const moderatorAuths = await ArrayUtil.asyncRepeat(3, async () => {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(memberAuth);
    return memberAuth;
  });
  const moderatorAssignments = await ArrayUtil.asyncMap(
    moderatorAuths,
    async (memberAuth) => {
      const assignment =
        await generate_random_community_platform_member_communities_moderators_create(
          ownerConnection,
          {
            params: {
              communitySlug: community.slug,
            },
            body: {
              member_code: memberAuth.code,
            },
          },
        );
      typia.assert(assignment);
      return assignment;
    },
  );
  const baseline =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline roster includes owner and created moderators",
    baseline.pagination.records,
    moderatorAssignments.length + 1,
  );
  const moderatorOnly =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorOnly);
  TestValidator.equals(
    "moderator roster record count matches created moderators",
    moderatorOnly.pagination.records,
    moderatorAssignments.length,
  );
  TestValidator.predicate(
    "moderator roster only contains moderator roles",
    moderatorOnly.data.every((item) => item.role === "moderator"),
  );
  TestValidator.predicate(
    "moderator roster excludes owner roles",
    moderatorOnly.data.every((item) => item.role !== "owner"),
  );
  const ownerOnly =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "owner",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(ownerOnly);
  TestValidator.equals(
    "owner roster contains one owner assignment",
    ownerOnly.pagination.records,
    1,
  );
  TestValidator.predicate(
    "owner roster only contains owner roles",
    ownerOnly.data.every((item) => item.role === "owner"),
  );
  const emailTarget = moderatorAuths[0];
  const emailSearch =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: emailTarget.email,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(emailSearch);
  TestValidator.predicate(
    "email search returns at least one assignment",
    emailSearch.pagination.records >= 1,
  );
  TestValidator.predicate(
    "email search includes target assignment",
    ArrayUtil.has(
      emailSearch.data,
      (item) => item.member.code === emailTarget.code,
    ),
  );
  TestValidator.predicate(
    "email search results match supported member identity fields",
    emailSearch.data.every(
      (item) =>
        item.member.email.includes(emailTarget.email) ||
        item.member.code.includes(emailTarget.email),
    ),
  );
  const codeTarget = moderatorAuths[1];
  const codeSearch =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: codeTarget.code,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(codeSearch);
  TestValidator.predicate(
    "code search returns at least one assignment",
    codeSearch.pagination.records >= 1,
  );
  TestValidator.predicate(
    "code search includes target assignment",
    ArrayUtil.has(
      codeSearch.data,
      (item) => item.member.code === codeTarget.code,
    ),
  );
  TestValidator.predicate(
    "code search results match supported member identity fields",
    codeSearch.data.every(
      (item) =>
        item.member.code.includes(codeTarget.code) ||
        item.member.email.includes(codeTarget.code),
    ),
  );
  const pagedModeratorFirst =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(pagedModeratorFirst);
  TestValidator.equals(
    "first page current number",
    pagedModeratorFirst.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    pagedModeratorFirst.pagination.limit,
    1,
  );
  TestValidator.equals(
    "first page filtered records",
    pagedModeratorFirst.pagination.records,
    moderatorOnly.pagination.records,
  );
  TestValidator.equals(
    "first page total pages from filtered records",
    pagedModeratorFirst.pagination.pages,
    Math.ceil(
      pagedModeratorFirst.pagination.records /
        pagedModeratorFirst.pagination.limit,
    ),
  );
  TestValidator.predicate(
    "first page data length within limit",
    pagedModeratorFirst.data.length <= pagedModeratorFirst.pagination.limit,
  );
  const pagedModeratorSecond =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
          page: 2,
          limit: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(pagedModeratorSecond);
  TestValidator.equals(
    "second page current number",
    pagedModeratorSecond.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    pagedModeratorSecond.pagination.limit,
    1,
  );
  TestValidator.equals(
    "second page filtered records match first page metadata",
    pagedModeratorSecond.pagination.records,
    pagedModeratorFirst.pagination.records,
  );
  TestValidator.equals(
    "second page total pages match first page metadata",
    pagedModeratorSecond.pagination.pages,
    pagedModeratorFirst.pagination.pages,
  );
  TestValidator.predicate(
    "second page data length within limit",
    pagedModeratorSecond.data.length <= pagedModeratorSecond.pagination.limit,
  );
  TestValidator.predicate(
    "second page emptiness follows total pages",
    pagedModeratorSecond.pagination.pages >= 2
      ? pagedModeratorSecond.data.length >= 1
      : pagedModeratorSecond.data.length === 0,
  );
  const emptySearchTerm = `no-match-${RandomGenerator.alphaNumeric(24)}`;
  const emptyPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
          search: emptySearchTerm,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page record count",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty page total pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}
