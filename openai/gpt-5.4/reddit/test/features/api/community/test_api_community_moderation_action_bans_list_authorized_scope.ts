import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderation_action_bans_list_authorized_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createdCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdCommunity);
  const fixtureCommunityId = "11111111-1111-1111-1111-111111111111" as string &
    tags.Format<"uuid">;
  const fixtureModerationActionId =
    "22222222-2222-2222-2222-222222222222" as string & tags.Format<"uuid">;
  const requestBody = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    hasExpiredAt: false,
    hasLiftedAt: false,
    sort: "-created_at",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationActionBan.IRequest;
  const page =
    await api.functional.communityPlatform.member.communities.moderationActions.bans.index(
      memberConnection,
      {
        communityId: fixtureCommunityId,
        moderationActionId: fixtureModerationActionId,
        body: requestBody,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "requested page reflected in pagination metadata",
    page.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "requested limit reflected in pagination metadata",
    page.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "record count is at least current page size",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "zero records imply empty data",
    page.pagination.records !== 0 || page.data.length === 0,
  );
  TestValidator.predicate(
    "pages are coherent with records and limit",
    page.pagination.limit === 0 ||
      page.pagination.pages >=
        Math.ceil(page.pagination.records / page.pagination.limit),
  );
  for (const item of page.data) {
    TestValidator.equals(
      "linked ban belongs to requested community",
      item.communityBan.community.id,
      fixtureCommunityId,
    );
    TestValidator.predicate(
      "linked community ban has a reason",
      item.communityBan.reason.length > 0,
    );
    TestValidator.predicate(
      "linked community ban has status",
      item.communityBan.status.length > 0,
    );
  }
}
