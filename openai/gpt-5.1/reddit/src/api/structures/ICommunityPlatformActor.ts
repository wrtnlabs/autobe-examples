import { tags } from "typia";

export namespace ICommunityPlatformActor {
  /**
   * Lightweight summary of an actor who can perform or be the subject of
   * moderation actions.
   *
   * This DTO unifies core identification fields for different actor types
   * such as member users, community moderators, platform administrators, and
   * guest users when they appear in moderation and audit contexts.
   *
   * It is intentionally small to keep moderation lists and audit logs
   * efficient while still giving humans enough information to recognize who
   * the actor is, without exposing sensitive or implementation‑specific
   * details from the underlying actor tables.
   */
  export type ISummary = {
    /**
     * Stable UUID identifier of the actor within the community platform.
     *
     * This value typically corresponds to the primary key of the underlying
     * actor record, such as `community_platform_memberusers.id`,
     * `community_platform_communitymoderators.id`,
     * `community_platform_platformadmins.id`, or
     * `community_platform_guestusers.id`. It is used as the canonical join
     * key when correlating moderation actions, sanctions, and audit events
     * to a specific actor.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Discriminator indicating which actor table this summary originates
     * from.
     *
     * Examples include values such as `memberuser`, `communitymoderator`,
     * `platformadmin`, or `guestuser`. The set of possible values must
     * align with the platform's actor type enum used across moderation and
     * security subsystems so that clients can branch on actor category in a
     * stable, code‑friendly way.
     */
    actorType: string;

    /**
     * Human‑readable display name for the actor, suitable for showing in
     * moderation lists and audit logs.
     *
     * For member users this is often their chosen display name or username;
     * for moderators and admins this may include a role‑specific label or a
     * verified staff handle. This value is intended for direct rendering in
     * UI and should already be sanitized for display.
     */
    displayName: string;

    /**
     * URL of the actor's avatar image used in UI contexts.
     *
     * When present, this URL points to a pre‑uploaded image in a storage
     * service and follows the platform's URL‑only file handling policy.
     * When the actor has no avatar configured, this field may be omitted,
     * and clients are expected to fall back to a default placeholder
     * avatar.
     */
    avatarUrl?: (string & tags.Format<"uri">) | undefined;
  };
}
