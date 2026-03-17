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

export async function test_api_community_snapshot_history_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
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
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const createdAtFrom = new Date(
    "2000-01-01T00:00:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const createdAtTo = new Date(
    "2100-01-01T00:00:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const fromTime = new Date(createdAtFrom).getTime();
  const toTime = new Date(createdAtTo).getTime();
  const page = 1 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = 10 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const visibility = "public";
  const sort = "+created_at";
  const response =
    await api.functional.communityPlatform.communities.snapshots.index(
      memberConnection,
      {
        communitySlug: community.id,
        body: {
          visibility,
          createdAtFrom,
          createdAtTo,
          page,
          limit,
          sort,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current matches request",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length respects limit",
    response.data.length <= limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    response.pagination.records >= 0,
  );
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination pages internally consistent",
    response.pagination.pages,
    expectedPages,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    const createdAt = new Date(snapshot.created_at).getTime();
    TestValidator.equals(
      "visibility matches filter",
      snapshot.visibility,
      visibility,
    );
    TestValidator.predicate(
      "created_at is on or after lower bound",
      createdAt >= fromTime,
    );
    TestValidator.predicate(
      "created_at is on or before upper bound",
      createdAt <= toTime,
    );
    TestValidator.equals(
      "deleted snapshots are excluded by default",
      snapshot.deleted_at,
      null,
    );
  }
  for (let i = 1; i < response.data.length; i++) {
    const previous = response.data[i - 1];
    const current = response.data[i];
    TestValidator.predicate(
      "results are sorted by created_at ascending",
      new Date(previous.created_at).getTime() <=
        new Date(current.created_at).getTime(),
    );
  }
}
