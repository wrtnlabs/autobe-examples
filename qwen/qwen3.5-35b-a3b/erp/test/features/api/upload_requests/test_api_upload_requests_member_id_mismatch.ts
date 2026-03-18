import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_upload_requests_create } from "../../../generate/generate_random_hrms_member_upload_requests_create";
import { prepare_random_hrms_file_upload } from "../../../prepare/prepare_random_hrms_file_upload";

export async function test_api_upload_requests_member_id_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authenticatedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authenticatedMember);
  // 2. Get organization from member's organization memberships
  const memberOrg = authenticatedMember.organization_memberships[0];
  typia.assert(memberOrg);
  const organization_id = memberOrg.organization.id;
  // 3. Create file upload request (member_id is extracted from JWT, not sent in body)
  const uploadRequest = await api.functional.hrms.member.upload_requests.create(
    memberConnection,
    {
      body: {
        organization_id,
        original_filename: RandomGenerator.paragraph({ sentences: 2 }),
        file_type: "application/pdf",
        file_size: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1> &
            tags.Maximum<1073741824>
        >(),
      } satisfies IHrmsFileUpload.ICreate,
    },
  );
  typia.assert(uploadRequest);
  // 4. Verify the created upload request has the correct member_id (from JWT)
  // This validates the system correctly prevents member_id mismatches
  TestValidator.equals(
    "upload request member_id matches authenticated user",
    uploadRequest.member_id,
    authenticatedMember.id,
  );
  // 5. Verify the member relationship is correctly linked
  TestValidator.equals(
    "upload request member reference matches authenticated user",
    uploadRequest.member.id,
    authenticatedMember.id,
  );
}