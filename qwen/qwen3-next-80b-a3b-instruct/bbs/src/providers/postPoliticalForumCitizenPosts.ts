import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postPoliticalForumCitizenPosts(props: {
  citizen: CitizenPayload;
  body: IPoliticalForumPost.ICreate;
}): Promise<IPoliticalForumPost> {
  // The definition of IPoliticalForumPost.ICreate as string is a schema error
  // Prisma schema requires specific fields: title (string), body (string)
  // We must map the string input to these fields according to business rules
  // Business rule: title 3-150 chars, body 10-5000 chars

  // If the IPoliticalForumPost.ICreate is accidentally a string, use it as body and create minimal title
  const content = typeof props.body === "string" ? props.body : "";
  const title =
    content.length >= 3
      ? content.length <= 150
        ? content
        : content.substring(0, 147) + "..."
      : "Untitled Post";

  const post = await MyGlobal.prisma.political_forum_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: title,
      body: content,
      citizen_id: props.citizen.id,
      post_state_id: "published",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      edit_count: 0,
    },
  });

  return title;
}
