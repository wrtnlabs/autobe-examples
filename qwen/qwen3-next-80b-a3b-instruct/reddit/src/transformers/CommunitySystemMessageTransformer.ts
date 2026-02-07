import { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunitySystemMessageTransformer {
  export type Payload = Prisma.community_system_messagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        published_at: true,
        visible_until: true,
        status: true,
      },
    } satisfies Prisma.community_system_messagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunitySystemMessage> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      published_at: toISOStringSafe(input.published_at),
      visible_until: input.visible_until
        ? toISOStringSafe(input.visible_until)
        : null,
      status: typia.assert<"draft" | "published" | "archived">(input.status),
    };
  }
}
