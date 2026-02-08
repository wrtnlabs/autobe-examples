import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace CommunityPlatformCommunityCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunity.ICreate;
    ownerUser: IEntity;
  }) {
    const id: string = v4();
    // Access properties safely with null fallback
    const name = (props.body as any).name ?? null;
    const description = (props.body as any).description ?? null;
    const icon_url = (props.body as any).icon_url ?? null;
    const now = new Date();
    return {
      id,
      name,
      description,
      icon_url,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
      ownerUser: { connect: { id: props.ownerUser.id } },
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
