import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeAttachmentReferenceCollector {
  export async function collect(props: {
    body: IRedditLikeAttachmentReference.ICreate;
    referenceType: "profile" | "community" | "post";
  }) {
    return {
      id: v4(),
      reference_type: props.referenceType,
      created_at: new Date(),
      attachment: { connect: { id: props.body.attachmentId } },
    } satisfies Prisma.reddit_like_attachment_referencesCreateInput;
  }
}
