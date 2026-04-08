import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organization_file } from "../prepare/prepare_random_hrm_platform_organization_file";

/**
 * Generate a random organization file for E2E testing.
 *
 * Prepares random file metadata using the prepare function, then calls the creation endpoint to register a file record within the specified organization. The file is scoped to the organization and associated with the authenticated member.
 */
export async function generate_random_hrm_platform_member_organizations_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganizationFile.ICreate>;
    params?: {
      organizationId: string;
    };
  },
): Promise<IHrmPlatformOrganizationFile> {
  const prepared: IHrmPlatformOrganizationFile.ICreate =
    prepare_random_hrm_platform_organization_file(props.body);
  
  const generateUuid = (): string => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  
  const result: IHrmPlatformOrganizationFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      connection,
      {
        organizationId: props.params?.organizationId ?? generateUuid(),
        body: prepared,
      },
    );
  return result;
}