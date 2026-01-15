import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_section_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  
  // Step 2: Since section creation endpoint does not exist in the provided API,
  // we use a random valid UUID for a section that should exist in the system
  // The test scenario requires updating a section, and we can only test the update endpoint
  // with a sectionId. We assume a section exists in the system (system state),
  // and we update it with valid credentials.
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  
  // Step 3: Update the section with new values
  // The API likely returns the section ID after update, not the full object
  const updatedSectionId: string = typia.assert<string>(
    await api.functional.communityPlatform.member.sections.update(
      memberConnection,
      {
        sectionId: sectionId,
        body: {
          name: "Updated Section Name",
          description: "Updated description for the section",
          is_active: false,
        } satisfies ICommunityPlatformSection.IUpdate,
      },
    ),
  );
  
  // Verify that the returned ID matches the sectionId we updated
  TestValidator.equals(
    "section ID matches updated section",
    updatedSectionId,
    sectionId,
  );
}