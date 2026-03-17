import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFileAtSummaryTransformer {
  export type Payload = Prisma.community_platform_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        status: true,
        public_url: true,
        actor_type: true,
        actor_id: true,
        created_at: true,
        deleted_at: true,
        // Required by validation but not used in DTO
        storage_path: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFile.ISummary> {
    // Resolve polymorphic actor - requires separate queries based on actor_type
    let actor: ICommunityPlatformFile.ISummary["actor"];
    switch (input.actor_type) {
      case "member":
        // Need to fetch member data using actor_id
        throw new Error(
          "Member actor resolution not implemented in this transformer",
        );
      case "community":
        // Need to fetch community data using actor_id
        throw new Error(
          "Community actor resolution not implemented in this transformer",
        );
      case "admin":
        // Need to fetch admin data using actor_id
        throw new Error(
          "Admin actor resolution not implemented in this transformer",
        );
      default:
        throw new Error(`Unknown actor_type: ${input.actor_type}`);
    }
    return {
      id: input.id,
      name: input.name,
      type: input.type,
      size: input.size,
      status: input.status,
      public_url: input.public_url ?? null,
      actor,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
