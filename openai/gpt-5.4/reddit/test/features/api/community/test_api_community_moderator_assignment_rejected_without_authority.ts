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

export async function test_api_community_moderator_assignment_rejected_without_authority(
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
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(targetCommunity);
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(unauthorizedAuth);
  const candidateConnection: api.IConnection = { host: connection.host };
  const candidateAuth = await authorize_member_join(candidateConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(candidateAuth);
  TestValidator.notEquals(
    "owner and unauthorized member differ",
    ownerAuth.id,
    unauthorizedAuth.id,
  );
  TestValidator.notEquals(
    "owner and candidate member differ",
    ownerAuth.id,
    candidateAuth.id,
  );
  TestValidator.notEquals(
    "unauthorized member and candidate differ",
    unauthorizedAuth.id,
    candidateAuth.id,
  );
  TestValidator.equals(
    "community slug matches create request",
    targetCommunity.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "community title matches create request",
    targetCommunity.title,
    communityBody.title,
  );
  TestValidator.equals(
    "community description matches create request",
    targetCommunity.description,
    communityBody.description,
  );
  await TestValidator.httpError(
    "non-owner non-moderator cannot assign moderator in another member community",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.update(
        unauthorizedConnection,
        {
          communityId: targetCommunity.id,
          moderatorId: candidateAuth.id,
        },
      );
    },
  );
}
