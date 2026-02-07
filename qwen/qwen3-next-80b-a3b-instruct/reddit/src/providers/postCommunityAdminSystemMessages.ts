import { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunitySystemMessageTransformer } from "../transformers/CommunitySystemMessageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminSystemMessages(props: {
  admin: AdminPayload;
  body: ICommunitySystemMessage.ICreate;
}): Promise<ICommunitySystemMessage> {
  const now = new Date();
  const publishedAt = new Date(now);
  const visibleUntil = null;
  // Validate status if provided in body (though empty interface, for safety)
  // Since body is empty ICreate, any custom status must be validated at collect level
  const created = await MyGlobal.prisma.community_system_messages.create({
    data: {
      id: v4(),
      title: "",
      content: "",
      created_at: now,
      updated_at: now,
      published_at: publishedAt,
      visible_until: visibleUntil,
      status: "draft",
    },
    ...CommunitySystemMessageTransformer.select(),
  });
  return await CommunitySystemMessageTransformer.transform(created);
}
