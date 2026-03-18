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
    owner: IEntity;
  }) {
    const now = toISOStringSafe(new Date());
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      icon_href: props.body.icon_href,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      owner: { connect: { id: props.owner.id } },
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
