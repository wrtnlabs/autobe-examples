import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_files_create } from "../../../generate/generate_random_hrm_platform_member_organizations_files_create";
import { prepare_random_hrm_platform_organization_file } from "../../../prepare/prepare_random_hrm_platform_organization_file";

export async function test_api_file_retrieval_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member 1 joins and creates Organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(member1Auth);
  typia.assert(member1Auth.member);
  const orgA: IHrmPlatformOrganization.ISummary = member1Auth.member as unknown as IHrmPlatformOrganization.ISummary;
  // 2. Upload a file to Organization A using member1Connection
  const fileA =
    await api.functional.hrmPlatform.member.organizations.files.create(
      member1Connection,
      {
        organizationId: orgA.id,
        body: {
          file_key: `org_a/${typia.random<string & tags.Format<"uuid">>()}`,
          file_name: RandomGenerator.name(),
          file_type: "document",
          file_size: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(fileA);
  TestValidator.predicate(
    "file belongs to org A",
    fileA.organization.id === orgA.id,
  );
  // 3. Member 2 joins and creates Organization B
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(member2Auth);
  typia.assert(member2Auth.member);
  const orgB: IHrmPlatformOrganization.ISummary = member2Auth.member as unknown as IHrmPlatformOrganization.ISummary;
  // 4. Upload a separate file to Organization B using member2Connection
  const fileB =
    await api.functional.hrmPlatform.member.organizations.files.create(
      member2Connection,
      {
        organizationId: orgB.id,
        body: {
          file_key: `org_b/${typia.random<string & tags.Format<"uuid">>()}`,
          file_name: RandomGenerator.name(),
          file_type: "document",
          file_size: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(fileB);
  TestValidator.predicate(
    "file belongs to org B",
    fileB.organization.id === orgB.id,
  );
  // 5. Attempt to retrieve file from Organization A using Organization B's context
  // This should return 404 Not Found due to organization isolation
  await TestValidator.httpError(
    "should return 404 when accessing org A file from org B context",
    [404],
    async () => {
      await api.functional.hrmPlatform.member.organizations.files.at(
        member2Connection,
        {
          organizationId: orgB.id,
          fileId: fileA.id,
        },
      );
    },
  );
  // 6. Verify we CAN access file B from Organization B (sanity check)
  const fileBAgain =
    await api.functional.hrmPlatform.member.organizations.files.at(
      member2Connection,
      {
        organizationId: orgB.id,
        fileId: fileB.id,
      },
    );
  typia.assert(fileBAgain);
  TestValidator.equals("file B accessible from org B", fileBAgain.id, fileB.id);
  TestValidator.predicate(
    "file B belongs to org B",
    fileBAgain.organization.id === orgB.id,
  );
}