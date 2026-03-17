import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFileProcessTransformer } from "./CommunityPlatformFileProcessTransformer";

export namespace CommunityPlatformFileProcessStepTransformer {
  export type Payload = Prisma.community_platform_file_process_stepsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        step_name: true,
        status: true,
        metadata: true,
        created_at: true,
        fileProcess: CommunityPlatformFileProcessTransformer.select(),
      },
    } satisfies Prisma.community_platform_file_process_stepsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFileProcessStep> {
    return {
      id: input.id,
      step_name: input.step_name,
      status: input.status,
      metadata: input.metadata ?? null,
      created_at: input.created_at.toISOString(),
      fileProcess: await CommunityPlatformFileProcessTransformer.transform(
        input.fileProcess,
      ),
    };
  }
}
