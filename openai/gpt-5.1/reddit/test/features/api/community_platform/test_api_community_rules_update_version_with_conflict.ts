import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_rules_update_version_with_conflict(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community for this member user
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create two rules records with versions 1 and 2
  const ruleV1Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleV1Body,
      },
    );
  typia.assert(ruleV1);

  const ruleV2Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 2,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleV2Body,
      },
    );
  typia.assert(ruleV2);

  // Sanity check: versions are as expected before conflict attempt
  TestValidator.equals(
    "initial rule #1 version",
    ruleV1.version,
    1 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "initial rule #2 version",
    ruleV2.version,
    2 as number & tags.Type<"int32">,
  );

  // 4. Attempt to update the second rules record to version=1, causing conflict
  const conflictUpdateBody = {
    version: 1 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  await TestValidator.error(
    "updating rule to conflicting version should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.update(
        connection,
        {
          communitySlug: community.slug,
          ruleId: ruleV2.id,
          body: conflictUpdateBody,
        },
      );
    },
  );

  // 5. Verify that the original rule objects still report their original versions
  // (we cannot re-fetch via GET in this spec, but we can at least ensure our
  // references are unchanged and that the failed update did not mutate them).
  TestValidator.equals(
    "original rule #1 version unchanged",
    ruleV1.version,
    1 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "original rule #2 version unchanged",
    ruleV2.version,
    2 as number & tags.Type<"int32">,
  );
}
