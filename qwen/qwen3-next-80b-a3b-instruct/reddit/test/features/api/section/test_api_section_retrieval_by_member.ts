import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // Step 2: Admin login to establish session
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: "admin123",
      href: adminJoinBody.href,
      referrer: adminJoinBody.referrer,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 3: Create member connection and authenticate member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  // Step 4: Member login to establish session
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 5: Admin creates a section using admin-specific connection
  const createdSectionId: string =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          visibility_level: "registered",
          parent_section_id: undefined,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(createdSectionId);
  // Step 6: Member retrieves the section using member-specific connection
  const retrievedSectionId: string =
    await api.functional.communityPlatform.member.sections.at(
      memberConnection,
      {
        sectionId: createdSectionId,
      },
    );
  typia.assert(retrievedSectionId);
  // Step 7: Validate that the retrieved section ID matches the created section ID
  TestValidator.equals(
    "retrieved section ID matches created section ID",
    retrievedSectionId,
    createdSectionId,
  );
}