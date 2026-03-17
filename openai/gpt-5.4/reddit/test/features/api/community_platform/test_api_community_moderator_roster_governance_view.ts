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

export async function test_api_community_moderator_roster_governance_view(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(moderatorMemberAuth);
  const primaryCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(primaryCommunity);
  const secondaryCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondaryCommunity);
  const primaryModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: primaryCommunity.slug,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(primaryModeratorAssignment);
  const secondaryModeratorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: secondaryCommunity.slug,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondaryModeratorAssignment);
  const pageNumber = 1;
  const pageLimit = 10;
  const page =
    await api.functional.communityPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: primaryCommunity.id,
        body: {
          page: pageNumber,
          limit: pageLimit,
          sort: "+created_at",
        },
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "pagination records covers returned data",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages is zero only when records is zero or positive otherwise",
    page.pagination.records === 0
      ? page.pagination.pages === 0
      : page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current page stays within total pages when pages exist",
    page.pagination.pages === 0 ||
      page.pagination.current <= page.pagination.pages,
  );
  TestValidator.predicate(
    "roster contains owner and moderator assignments",
    page.data.length >= 2,
  );
  page.data.forEach((item) => {
    TestValidator.equals(
      "assignment community id matches primary community",
      item.community.id,
      primaryCommunity.id,
    );
    TestValidator.equals(
      "assignment community slug matches primary community",
      item.community.slug,
      primaryCommunity.slug,
    );
    TestValidator.equals(
      "assignment community title matches primary community",
      item.community.title,
      primaryCommunity.title,
    );
    TestValidator.equals(
      "assignment community description matches primary community",
      item.community.description,
      primaryCommunity.description,
    );
    TestValidator.notEquals(
      "assignment community id excludes secondary community",
      item.community.id,
      secondaryCommunity.id,
    );
    TestValidator.notEquals(
      "assignment community slug excludes secondary community",
      item.community.slug,
      secondaryCommunity.slug,
    );
    TestValidator.predicate("assignment has role", item.role.length > 0);
    TestValidator.predicate("assignment has status", item.status.length > 0);
    TestValidator.predicate(
      "assignment has granted timestamp",
      item.granted_at.length > 0,
    );
    TestValidator.predicate(
      "assignment has created timestamp",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "assignment has updated timestamp",
      item.updated_at.length > 0,
    );
    if (item.status === "active") {
      TestValidator.equals(
        "active assignment revokedByMember is null",
        item.revokedByMember,
        null,
      );
      TestValidator.equals(
        "active assignment revoked_at is null",
        item.revoked_at,
        null,
      );
      TestValidator.equals(
        "active assignment revocation_reason is null",
        item.revocation_reason,
        null,
      );
    }
  });
  const ownerAssignment = page.data.find(
    (item) => item.member.id === ownerAuth.id,
  );
  const moderatorAssignment = page.data.find(
    (item) => item.member.id === moderatorMemberAuth.id,
  );
  TestValidator.predicate(
    "owner assignment is included in roster",
    ownerAssignment !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment is included in roster",
    moderatorAssignment !== undefined,
  );
  if (ownerAssignment === undefined || moderatorAssignment === undefined)
    return;
  TestValidator.notEquals(
    "owner and moderator roles are distinct",
    ownerAssignment.role,
    moderatorAssignment.role,
  );
  TestValidator.equals(
    "owner assignment member matches community owner",
    ownerAssignment.member.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "moderator assignment member matches added moderator",
    moderatorAssignment.member.id,
    moderatorMemberAuth.id,
  );
  TestValidator.equals(
    "owner assignment community matches primary community",
    ownerAssignment.community.id,
    primaryCommunity.id,
  );
  TestValidator.equals(
    "moderator assignment community matches primary community",
    moderatorAssignment.community.id,
    primaryCommunity.id,
  );
  TestValidator.equals(
    "owner assignment granted by owner",
    ownerAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "moderator assignment granted by owner",
    moderatorAssignment.grantedByMember.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "created moderator assignment appears in primary roster",
    moderatorAssignment.id,
    primaryModeratorAssignment.id,
  );
  TestValidator.notEquals(
    "primary roster excludes second community moderator assignment",
    moderatorAssignment.id,
    secondaryModeratorAssignment.id,
  );
}
