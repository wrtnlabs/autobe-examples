import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeMemberPasswordResetCollector {
  export async function collect(props: {
    body: IRedditLikeMemberPasswordReset.ICreate;
  }) {
    const id: string = v4();
    // Query member by email (case-insensitive)
    const member = await MyGlobal.prisma.reddit_like_members.findFirst({
      where: {
        email: {
          equals: props.body.email,
          mode: "insensitive",
        },
        deleted_at: null,
      },
    });
    // If member not found, cannot create password reset (schema requires non-nullable relation)
    if (!member) {
      throw new Error("Member not found");
    }
    // Generate secure random token (using v4 UUID)
    const token: string = v4();
    // Set expiration to 1 hour from now
    const expires_at: Date = new Date(Date.now() + 60 * 60 * 1000);
    return {
      id,
      token,
      expires_at,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      redditLikeMember: { connect: { id: member.id } },
    } satisfies Prisma.reddit_like_member_password_resetsCreateInput;
  }
}
