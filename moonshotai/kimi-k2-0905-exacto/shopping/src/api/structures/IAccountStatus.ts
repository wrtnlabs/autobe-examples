export namespace IAccountStatus {
  /**
   * Account status representation for administrative interfaces and user
   * management displays. This provides a lightweight status indicator for
   * account lifecycle states including active, suspended, pending
   * verification, and deactivated states. Used in user lists, account
   * management dashboards, and quick reference scenarios where full account
   * details are not needed.
   */
  export type ISummary = "active" | "suspended" | "pending" | "deactivated";
}
