import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
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

export async function test_api_community_snapshot_history_empty_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityBeforeHistory = {
    id: community.id,
    slug: community.slug,
    title: community.title,
    description: community.description,
    status: community.status,
    subscriber_count: community.subscriber_count,
    created_at: community.created_at,
    updated_at: community.updated_at,
    deleted_at: community.deleted_at,
  } satisfies Omit<ICommunityPlatformCommunity, "member">;
  const request = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunitySnapshot.IRequest;
  const history =
    await api.functional.communityPlatform.communities.snapshots.index(
      memberConnection,
      {
        communitySlug: community.id,
        body: request,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "empty-state current page matches request",
    history.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "empty-state limit matches request",
    history.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "empty-state has zero matching records",
    history.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty-state has zero total pages",
    history.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty-state returns no snapshot rows",
    history.data.length,
    0,
  );
  TestValidator.equals(
    "community id unchanged after read-only history request",
    community.id,
    communityBeforeHistory.id,
  );
  TestValidator.equals(
    "community slug unchanged after read-only history request",
    community.slug,
    communityBeforeHistory.slug,
  );
  TestValidator.equals(
    "community title unchanged after read-only history request",
    community.title,
    communityBeforeHistory.title,
  );
  TestValidator.equals(
    "community description unchanged after read-only history request",
    community.description,
    communityBeforeHistory.description,
  );
  TestValidator.equals(
    "community status unchanged after read-only history request",
    community.status,
    communityBeforeHistory.status,
  );
  TestValidator.equals(
    "community subscriber count unchanged after read-only history request",
    community.subscriber_count,
    communityBeforeHistory.subscriber_count,
  );
  TestValidator.equals(
    "community created_at unchanged after read-only history request",
    community.created_at,
    communityBeforeHistory.created_at,
  );
  TestValidator.equals(
    "community updated_at unchanged after read-only history request",
    community.updated_at,
    communityBeforeHistory.updated_at,
  );
  TestValidator.equals(
    "community deleted_at unchanged after read-only history request",
    community.deleted_at,
    communityBeforeHistory.deleted_at,
  );
}
