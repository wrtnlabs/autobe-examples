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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_snapshots_create } from "../../../generate/generate_random_community_platform_member_communities_snapshots_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_snapshot } from "../../../prepare/prepare_random_community_platform_community_snapshot";

export async function test_api_community_snapshot_creation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphabets(4)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const visibilityOptions = ["public", "private", "restricted"] as const;
  const snapshotBody = {
    visibility: RandomGenerator.pick(visibilityOptions),
  } satisfies ICommunityPlatformCommunitySnapshot.ICreate;
  const snapshot =
    await generate_random_community_platform_member_communities_snapshots_create(
      memberConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot preserves requested visibility",
    snapshot.visibility,
    snapshotBody.visibility,
  );
  TestValidator.notEquals(
    "snapshot is a new historical record distinct from community",
    snapshot.id,
    community.id,
  );
  TestValidator.predicate(
    "snapshot has a non-empty created_at timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "snapshot starts with null deleted_at",
    snapshot.deleted_at,
    null,
  );
  TestValidator.equals(
    "embedded community id matches parent community",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "embedded community slug matches parent community",
    snapshot.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "embedded community title matches parent community",
    snapshot.community.title,
    community.title,
  );
  TestValidator.equals(
    "embedded community description matches parent community",
    snapshot.community.description,
    community.description,
  );
  TestValidator.equals(
    "embedded community status matches parent community",
    snapshot.community.status,
    community.status,
  );
  TestValidator.equals(
    "embedded community subscriber_count matches parent community",
    snapshot.community.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "embedded community created_at matches parent community",
    snapshot.community.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "embedded community updated_at matches parent community",
    snapshot.community.updated_at,
    community.updated_at,
  );
  TestValidator.equals(
    "embedded community deleted_at matches parent community",
    snapshot.community.deleted_at,
    community.deleted_at,
  );
  TestValidator.equals(
    "embedded community member matches parent community member",
    snapshot.community.member,
    community.member,
  );
}
