import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformProjectSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_project_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        color_code: true,
        budget_hours: true,
        created_at: true,
        creator: HrmPlatformMemberAtSummaryTransformer.select(),
        project: true,
        organization: true,
      },
    } satisfies Prisma.hrm_platform_project_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProjectSnapshot> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      color_code: input.color_code,
      budget_hours: input.budget_hours ?? null,
      created_at: input.created_at.toISOString(),
      creator: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.creator,
      ),
    };
  }
}
