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

export async function test_api_upload_requests_member_not_in_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (will own an organization)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member1Auth);
  // Verify member1 has organization membership
  TestValidator.equals(
    "member1 has organization membership",
    member1Auth.organization_memberships.length,
    1,
  );
  typia.assert(member1Auth.organization_memberships[0]);
  const member1OrgId: string =
    member1Auth.organization_memberships[0].organization.id;
  // 2. Create second member account (will have no organization)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member2Auth);
  // Verify member2 has no organization memberships
  TestValidator.equals(
    "member2 has no organization memberships",
    member2Auth.organization_memberships.length,
    0,
  );
  // 3. Attempt to create upload request for organization member1 belongs to
  // This should be rejected because member2 is not a member of member1's org
  await TestValidator.error(
    "member2 cannot create upload request for organization they don't belong to",
    async () => {
      await api.functional.hrms.member.upload_requests.create(
        member2Connection,
        {
          body: {
            organization_id: member1OrgId,
            original_filename: "test-file.txt",
            file_type: "text/plain",
            file_size: 1024,
          } satisfies IHrmsFileUpload.ICreate,
        },
      );
    },
  );
}
