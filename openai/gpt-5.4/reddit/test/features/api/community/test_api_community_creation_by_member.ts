import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
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
  const guestCreateBody = {
    slug: `community-${RandomGenerator.alphabets(10)}-${Date.now()}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.httpError(
    "guest cannot create community",
    [401, 403],
    async () => {
      await generate_random_community_platform_member_communities_create(
        guestConnection,
        {
          body: guestCreateBody,
        },
      );
    },
  );
  const createBody = {
    slug: `community-${RandomGenerator.alphabets(10)}-${Date.now()}-member`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: createBody,
      },
    );
  typia.assert(community);
  TestValidator.equals("slug matches input", community.slug, createBody.slug);
  TestValidator.equals(
    "title matches input",
    community.title,
    createBody.title,
  );
  TestValidator.equals(
    "description matches input",
    community.description,
    createBody.description,
  );
  TestValidator.equals(
    "community owner member id matches authenticated member",
    community.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "community owner member code matches authenticated member",
    community.member.code,
    authorized.code,
  );
  TestValidator.equals(
    "community owner member email matches authenticated member",
    community.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "community owner member email verification matches authenticated member",
    community.member.email_verified,
    authorized.emailVerified,
  );
  TestValidator.equals(
    "community owner member status matches authenticated member",
    community.member.status,
    authorized.status,
  );
  TestValidator.equals(
    "community owner member last signed in matches authenticated member",
    community.member.last_signed_in_at,
    authorized.lastSignedInAt,
  );
  TestValidator.equals(
    "community owner member created at matches authenticated member",
    community.member.created_at,
    authorized.createdAt,
  );
  TestValidator.equals(
    "community owner member updated at matches authenticated member",
    community.member.updated_at,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "community owner member deleted at matches authenticated member",
    community.member.deleted_at,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "new community starts with zero subscribers",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community deleted_at is null",
    community.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "community id differs from owner member id",
    community.id,
    authorized.id,
  );
  TestValidator.predicate(
    "community has an active non-deleted lifecycle state",
    community.status.length > 0 && community.deleted_at === null,
  );
}
