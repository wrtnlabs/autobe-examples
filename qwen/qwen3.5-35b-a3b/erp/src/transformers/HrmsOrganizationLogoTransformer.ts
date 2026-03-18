import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationLogo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsOrganizationLogoTransformer {
  export type Payload = Prisma.hrms_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        logo_uri: true,
      },
    } satisfies Prisma.hrms_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationLogo> {
    return {
      logo_uri: input.logo_uri ?? null,
      organization_id: input.id,
    };
  }
}
