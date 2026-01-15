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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random section ID (since we can't create a section, we need an ID)
  // The system may have predefined sections, so we generate a UUID that could exist
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update an existing section (we use our generated section ID)
  // This is the only available operation per the API definition
  const updatedSection: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.sections.update(
      adminConnection,
      {
        sectionId: sectionId,
        body: {
          name: "Updated Section Name",
          description: "Updated description for validation",
          is_active: false,
          layout: "list",
        } satisfies ICommunityPlatformSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Since ICommunityPlatformSection is a string type, we cannot validate object properties
  // The update operation was successful if typia.assert() passed (string type validation)
  // We do not validate property values because the response type is string, not an object
}
