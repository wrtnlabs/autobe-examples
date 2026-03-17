import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFileAtSummaryTransformer } from "./CommunityPlatformFileAtSummaryTransformer";

export namespace CommunityPlatformFileProcessAtSummaryTransformer {
  export type Payload = Prisma.community_platform_file_processesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        completed_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: CommunityPlatformFileAtSummaryTransformer.select(),
        steps: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_file_process_stepsFindManyArgs,
      },
    } satisfies Prisma.community_platform_file_processesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFileProcess.ISummary> {
    return {
      id: input.id,
      startedAt: input.started_at?.toISOString() ?? null,
      completedAt: input.completed_at?.toISOString() ?? null,
      errorMessage: input.error_message ?? null,
      createdAt: input.created_at.toISOString(),
      status: (!input.started_at
        ? "pending"
        : input.started_at && !input.completed_at
          ? "processing"
          : input.completed_at && !input.error_message
            ? "completed"
            : "failed") as "pending" | "processing" | "completed" | "failed",
      file: await CommunityPlatformFileAtSummaryTransformer.transform(
        input.file,
      ),
    };
  }
}
