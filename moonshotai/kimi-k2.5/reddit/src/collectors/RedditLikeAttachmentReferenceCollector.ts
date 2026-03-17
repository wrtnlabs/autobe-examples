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
    profile?: {
      memberId: string;
    };
    community?: {
      communityId: string;
    };
    post?: {
      postId: string;
    };
  }) {
    const id: string = v4();
    return {
      id,
      reference_type: props.referenceType,
      created_at: new Date(),
      attachment: {
        connect: { id: props.body.attachmentId },
      },
      profileReference: props.profile
        ? {
            create: {
              id: v4(),
              member: {
                connect: { id: props.profile.memberId },
              },
              created_at: new Date(),
              updated_at: new Date(),
            },
          }
        : undefined,
      communityReference: props.community
        ? {
            create: {
              id: v4(),
              community: {
                connect: { id: props.community.communityId },
              },
              created_at: new Date(),
              updated_at: new Date(),
            },
          }
        : undefined,
      postReference: props.post
        ? {
            create: {
              id: v4(),
              post: {
                connect: { id: props.post.postId },
              },
              created_at: new Date(),
              updated_at: new Date(),
            },
          }
        : undefined,
    } satisfies Prisma.reddit_like_attachment_referencesCreateInput;
  }
}
