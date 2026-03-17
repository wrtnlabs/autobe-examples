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

export async function test_api_community_slug_conflict(
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
  const duplicateSlug = `community-${RandomGenerator.alphabets(8)}`;
  const originalTitle = RandomGenerator.name(2);
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const conflictingTitle = RandomGenerator.name(3);
  const conflictingDescription = RandomGenerator.content({ paragraphs: 3 });
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: duplicateSlug,
          title: originalTitle,
          description: originalDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community slug matches",
    firstCommunity.slug,
    duplicateSlug,
  );
  TestValidator.equals(
    "first community title matches",
    firstCommunity.title,
    originalTitle,
  );
  TestValidator.equals(
    "first community description matches",
    firstCommunity.description,
    originalDescription,
  );
  await TestValidator.error(
    "duplicate community slug is rejected",
    async () => {
      await generate_random_community_platform_member_communities_create(
        memberConnection,
        {
          body: {
            slug: duplicateSlug,
            title: conflictingTitle,
            description: conflictingDescription,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original community slug remains unchanged",
    firstCommunity.slug,
    duplicateSlug,
  );
  TestValidator.equals(
    "original community title remains unchanged",
    firstCommunity.title,
    originalTitle,
  );
  TestValidator.equals(
    "original community description remains unchanged",
    firstCommunity.description,
    originalDescription,
  );
}
