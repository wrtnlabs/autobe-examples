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

export async function test_api_upload_request_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A creates upload request
  const organizationId = memberA.organization_memberships[0].organization.id;
  const uploadRequestA =
    await generate_random_hrms_member_upload_requests_create(
      memberAConnection,
      {
        body: {
          organization_id: organizationId,
          original_filename: "test_a_document.pdf",
          file_type: "application/pdf",
          file_size: 1024,
        },
      },
    );
  typia.assert(uploadRequestA);
  // 4. Member B creates their own upload request
  const uploadRequestB =
    await generate_random_hrms_member_upload_requests_create(
      memberBConnection,
      {
        body: {
          organization_id: organizationId,
          original_filename: "test_b_document.pdf",
          file_type: "application/pdf",
          file_size: 2048,
        },
      },
    );
  typia.assert(uploadRequestB);
  // 5. Member B attempts to access Member A's upload request
  // This should return 404 as access control prevents viewing another member's upload request
  await TestValidator.error(
    "Member B should not be able to retrieve Member A's upload request",
    async () => {
      await api.functional.hrms.member.upload_requests.at(memberBConnection, {
        uploadRequestId: uploadRequestA.id,
      });
    },
  );
}
