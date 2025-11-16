import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Test updating a community as a non-creator member.
 *
 * This test validates that the system correctly enforces authorization rules,
 * allowing only community creators or administrators to update community
 * details. The workflow verifies that a regular member, who is not the creator
 * of the community, receives a 403 Forbidden error when attempting to update a
 * community they didn't create.
 *
 * Steps:
 *
 * 1. Authenticate as Admin member to create the community
 * 2. Create a community using admin credentials
 * 3. Authenticate as a different non-creator member
 * 4. Attempt to update the community using the non-creator member's credentials
 * 5. Validate that the system returns a 403 Forbidden error
 */
export async function test_api_community_update_by_non_creator(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to create the community
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass123!";
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(admin);

  // 2. Create a community as admin
  const communityName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const communityDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const communityTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] =
    ArrayUtil.repeat(3, () => RandomGenerator.alphaNumeric(5).toLowerCase());

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: communityTags,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // 3. Authenticate as a different non-creator member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPass123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 4. Attempt to update the community as a non-creator member
  const updatedName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const updatedTags: (string & tags.MinLength<1> & tags.MaxLength<30>)[] =
    ArrayUtil.repeat(2, () => RandomGenerator.alphaNumeric(5).toLowerCase());

  await TestValidator.error(
    "non-creator member should receive 403 Forbidden error when attempting to update community",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: createdCommunity.code,
          body: {
            name: updatedName,
            description: updatedDescription,
            tags: updatedTags,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
