import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinInput });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Create a new section with random data
  const sectionInput: ICommunityPlatformSection.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility_level: RandomGenerator.pick([
      "public",
      "registered",
      "moderated",
      "private",
    ] as const),
  } satisfies ICommunityPlatformSection.ICreate;
  // Step 3: Create the section using the admin connection
  const createdSection: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.sections.create(
      adminConnection,
      {
        body: sectionInput,
      },
    );
  typia.assert(createdSection);
}
